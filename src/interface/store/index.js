/**
 * WordPress dependencies
 */
import { createReduxStore, register } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { STORE_NAME } from './name';
import sidebarStoreConfig from './sidebar';
import modalStoreConfig from './modal';
import preferencesStoreConfig from './preferences';
import combineStores from '../../utils/combine-stores';

const storeConfig = combineStores(
	sidebarStoreConfig,
	modalStoreConfig,
	preferencesStoreConfig
);

export const store = createReduxStore( STORE_NAME, storeConfig );
register( store );
