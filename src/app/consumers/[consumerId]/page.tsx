import { Metadata, ResolvingMetadata } from 'next'
import { BasicConsumer as BasicConsumerType } from '@store/consumers/profile/types'
import { PageHeader, PageShell } from '@components/ui/layout'

type Props = {
  params: Promise<{
    consumerId: BasicConsumerType['id']
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const generateMetadata = async ({ params }: Props, _parent: ResolvingMetadata): Promise<Metadata> => {
  const { consumerId } = await params

  return {
    title: `Consumer page with an id ${consumerId}`,
    description: `ConsumerId => ${consumerId}`,
  }
}

export default async function Consumer({ params }: Props) {
  const { consumerId } = await params

  return (
    <PageShell as='article' width='prose'>
      <PageHeader title='Consumer' subtitle={`Id: ${consumerId}`} />
    </PageShell>
  )
}
