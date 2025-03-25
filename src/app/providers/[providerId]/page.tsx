import { Provider as ProviderType } from '@interfaces/provider'
import { GetStaticProps } from 'next';

const Provider = async (params: GetStaticProps<ProviderType>) => {
    console.log({ params });

    return (
        <article>{params.name}</article>
    )
}

export default Provider