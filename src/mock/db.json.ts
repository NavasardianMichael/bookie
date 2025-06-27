import { GetConsumersListAPI } from '@api/consumers/types';
import { GetProvidersListAPI } from '@api/providers/types';
import data from './db.json' assert { type: 'json' };

export type DBSchema = {
    consumers: GetConsumersListAPI['response']
    providers: GetProvidersListAPI['response']
}

export default data as DBSchema;