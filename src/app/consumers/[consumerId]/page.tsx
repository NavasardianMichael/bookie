import { Metadata, ResolvingMetadata } from 'next'
import { Consumer as ConsumerType } from '@store/consumers/profile/types'

type Props = {
  params: Promise<{
    consumerId: ConsumerType['id']
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const generateMetadata = async ({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> => {
  const { consumerId } = await params
  console.log(await parent)

  return {
    title: `Consumer page with an id ${consumerId}`,
    description: `ConsumerId => ${consumerId}`,
  }
}

const Consumer = async ({ params }: Props) => {
  const { consumerId } = await params
  return (
    <article>
      <header>Id fo the Consumer is: {consumerId}</header>
    </article>
  )
}

export default Consumer
