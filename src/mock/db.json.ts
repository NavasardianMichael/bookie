import { GetConsumersListAPI } from '@api/consumers/types';
import { GetProvidersListAPI } from '@api/providers/types';
import { Organization } from '@store/organizations/profile/types';
import data from './db.json' assert { type: 'json' };

export type DBSchema = {
    consumers: GetConsumersListAPI['response']
    providers: GetProvidersListAPI['response']
    organizations: Organization[]
}

export default data as DBSchema; 