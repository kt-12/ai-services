/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

/**
 * Formats the various supported formats of new user content into a consistent content shape.
 *
 * @since n.e.x.t
 *
 * @param {string|Object|Object[]} content New content.
 * @return {Object} The formatted new content.
 */
function formatNewContent( content ) {
	if ( typeof content === 'string' ) {
		return {
			role: 'user',
			parts: [ { text: content } ],
		};
	}

	if ( Array.isArray( content ) ) {
		// Could be an array of contents or parts.
		if ( content[ 0 ].role || content[ 0 ].parts ) {
			return content;
		}

		return {
			role: 'user',
			parts: content,
		};
	}

	if ( ! content.role || ! content.parts ) {
		throw new Error(
			__(
				'The value must be a string, a parts object, or a content object.',
				'wp-starter-plugin'
			)
		);
	}

	return content;
}

/**
 * Validates the chat history.
 *
 * @since n.e.x.t
 *
 * @param {Object[]} history Chat history.
 */
function validateChatHistory( history ) {
	history.forEach( ( content, index ) => {
		if ( ! content.role || ! content.parts ) {
			throw new Error(
				__(
					'The content object must have a role and parts properties.',
					'wp-starter-plugin'
				)
			);
		}

		if ( index === 0 && content.role !== 'user' ) {
			throw new Error(
				__(
					'The first content object in the history must be user content.',
					'wp-starter-plugin'
				)
			);
		}

		if ( content.parts.length === 0 ) {
			throw new Error(
				__(
					'Each Content instance must have at least one part.',
					'wp-starter-plugin'
				)
			);
		}
	} );
}

/**
 * Performs some very basic client-side validation for the content argument.
 *
 * @since n.e.x.t
 *
 * @param {string|Object|Object[]} content Content data to pass to the model, including the prompt and optional history.
 */
function validateContent( content ) {
	if ( ! content ) {
		throw new Error(
			__(
				'The content argument is required to generate content.',
				'wp-starter-plugin'
			)
		);
	}
	if ( ! Array.isArray( content ) ) {
		if ( typeof content === 'object' ) {
			if ( ! content.role || ! content.parts ) {
				throw new Error(
					__(
						'The content object must have a role and parts properties.',
						'wp-starter-plugin'
					)
				);
			}
		} else if ( typeof content !== 'string' ) {
			throw new Error(
				__(
					'The content argument must be a string, an object, or an array of objects.',
					'wp-starter-plugin'
				)
			);
		}
	}
}

/**
 * Service class.
 *
 * @since n.e.x.t
 */
class GenerativeAiService {
	/**
	 * Constructor.
	 *
	 * @since n.e.x.t
	 *
	 * @param {Object}   service                  Service object.
	 * @param {string}   service.slug             Service slug.
	 * @param {string}   service.name             Service name.
	 * @param {string[]} service.capabilities     AI capabilities that the service supports.
	 * @param {string[]} service.available_models Available models.
	 */
	constructor( { slug, name, capabilities, available_models: models } ) {
		if ( ! models || ! models.length ) {
			throw new Error(
				`No models available for the service ${ slug }. Is it available?`
			);
		}

		this.slug = slug;
		this.name = name;
		this.capabilities = capabilities;
		this.models = models;
	}

	/**
	 * Gets the service slug.
	 *
	 * @since n.e.x.t
	 *
	 * @return {string} Service name.
	 */
	getServiceSlug() {
		return this.slug;
	}

	/**
	 * Gets the list of AI capabilities that the service and its models support.
	 *
	 * @since n.e.x.t
	 *
	 * @return {string[]} The list of AI capabilities.
	 */
	getCapabilities() {
		return this.capabilities;
	}

	/**
	 * Lists the available generative model slugs.
	 *
	 * @since n.e.x.t
	 *
	 * @return {string[]} The available model slugs.
	 */
	listModels() {
		return this.models;
	}

	/**
	 * Generates text content using the service.
	 *
	 * @since n.e.x.t
	 *
	 * @param {Object}                 args             Arguments for generating content.
	 * @param {string|Object|Object[]} args.content     Content data to pass to the model, including the prompt and optional history.
	 * @param {string}                 args.model       Model slug.
	 * @param {Object}                 args.modelParams Model parameters.
	 * @return {Promise<Object[]>} Model response candidates with the generated text content.
	 */
	async generateText( { content, model, modelParams } ) {
		if ( ! this.capabilities.includes( 'text-generation' ) ) {
			throw new Error(
				__(
					'The service does not support text generation.',
					'wp-starter-plugin'
				)
			);
		}

		// Do some very basic validation.
		validateContent( content );

		try {
			return await apiFetch( {
				path: `/wp-starter-plugin/v1/services/${ this.slug }:generate-text`,
				method: 'POST',
				data: {
					content,
					model: model || '',
					modelParams: modelParams || {},
				},
			} );
		} catch ( error ) {
			throw new Error( error.message || error.code || error );
		}
	}

	/**
	 * Starts a multi-turn chat session using the service.
	 *
	 * @since n.e.x.t
	 *
	 * @param {Object}   args             Optional arguments for starting the chat session.
	 * @param {Object[]} args.history     Chat history.
	 * @param {string}   args.model       Model slug.
	 * @param {Object}   args.modelParams Model parameters.
	 * @return {ChatSession} Chat session.
	 */
	startChat( { history, model, modelParams } ) {
		if ( ! this.capabilities.includes( 'text-generation' ) ) {
			throw new Error(
				__(
					'The service does not support text generation.',
					'wp-starter-plugin'
				)
			);
		}

		return new ChatSession( this, { history, model, modelParams } );
	}
}

/**
 * Special service class only used for the 'browser' service.
 *
 * @since n.e.x.t
 */
class BrowserGenerativeAiService extends GenerativeAiService {
	/**
	 * Generates text content using the service.
	 *
	 * @since n.e.x.t
	 *
	 * @param {Object}                 args             Arguments for generating content.
	 * @param {string|Object|Object[]} args.content     Content data to pass to the model, including the prompt and optional history.
	 * @param {string}                 args.model       Model slug.
	 * @param {Object}                 args.modelParams Model parameters.
	 * @return {Promise<Object[]>} Model response candidates with the generated text content.
	 */
	async generateText( { content, model, modelParams } ) {
		if ( ! this.capabilities.includes( 'text-generation' ) ) {
			throw new Error(
				__(
					'The service does not support text generation.',
					'wp-starter-plugin'
				)
			);
		}

		// Do some very basic validation.
		validateContent( content );

		if ( typeof content !== 'string' ) {
			// If an array is passed, it's either parts (i.e. a single prompt) or history.
			if ( Array.isArray( content ) ) {
				let parts;
				if (
					( content[ 0 ].role || content[ 0 ].parts ) &&
					content.length > 1
				) {
					throw new Error(
						'The browser service does not support history at this time.'
					);
				} else if ( content[ 0 ].role || content[ 0 ].parts ) {
					parts = content[ 0 ].parts;
				} else {
					parts = content;
				}
				content = parts.map( ( part ) => part.text || '' ).join( '\n' );
			} else if ( typeof content === 'object' ) {
				content = content.parts
					.map( ( part ) => part.text || '' )
					.join( '\n' );
			}
		}

		if ( model ) {
			modelParams = {
				model,
				...modelParams,
			};
		}

		const session = await window.ai.createTextSession( modelParams );
		const resultText = await session.prompt( content );

		// Normalize result shape to match candidates API syntax from other services.
		return [
			{
				content: {
					role: 'model',
					parts: [ { text: resultText } ],
				},
			},
		];
	}
}

/**
 * Class representing a chat session with a generative model.
 *
 * @since n.e.x.t
 */
export class ChatSession {
	/**
	 * Constructor.
	 *
	 * @since n.e.x.t
	 *
	 * @param {GenerativeAiService} service             Generative AI service.
	 * @param {Object}              options             Chat options.
	 * @param {Object[]}            options.history     Chat history.
	 * @param {string}              options.model       Model slug.
	 * @param {Object}              options.modelParams Model parameters.
	 */
	constructor( service, { history, model, modelParams } ) {
		this.service = service;
		this.model = model;
		this.modelParams = modelParams;

		if ( history ) {
			validateChatHistory( history );
			this.history = history;
		} else {
			this.history = [];
		}
	}

	/**
	 * Gets the chat history.
	 *
	 * @since n.e.x.t
	 *
	 * @return {Object[]} Chat history.
	 */
	getHistory() {
		return this.history;
	}

	/**
	 * Sends a chat message to the model.
	 *
	 * @since n.e.x.t
	 *
	 * @param {string|Object|Object[]} content Chat message content.
	 * @return {Promise<Object>} The response content.
	 */
	async sendMessage( content ) {
		const newContent = formatNewContent( content );

		const contents = [ ...this.history, newContent ];

		const candidates = await this.service.generateText( {
			content: contents,
			model: this.model,
			modelParams: this.modelParams,
		} );

		// TODO: Support optional candidateFilterArgs, similar to PHP implementation.
		const responseContent = candidates[ 0 ].content;

		this.history = [ ...this.history, newContent, responseContent ];

		return responseContent;
	}
}

const services = {};

/**
 * Gets the generative AI service instance for the given service data.
 *
 * The service data must be an object received from the services REST endpoint.
 *
 * @since n.e.x.t
 *
 * @param {Object}   serviceData                  Service data.
 * @param {string}   serviceData.slug             Service slug.
 * @param {string}   serviceData.name             Service name.
 * @param {string[]} serviceData.available_models Available models.
 * @return {GenerativeAiService} Generative AI service instance.
 */
export function getGenerativeAiService( serviceData ) {
	if ( ! services[ serviceData.slug ] ) {
		if ( serviceData.slug === 'browser' ) {
			services[ serviceData.slug ] = new BrowserGenerativeAiService(
				serviceData
			);
		} else {
			services[ serviceData.slug ] = new GenerativeAiService(
				serviceData
			);
		}
	}

	return services[ serviceData.slug ];
}
