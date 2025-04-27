import { MOCK_CONSUMERS } from '@mock/consumers'
import { ROUTES } from '@constants/routes'
import AppLink from '@components/shared/AppLink'

const Consumers = () => {
  return (
    <div className="flex gap-4">
      {MOCK_CONSUMERS.map((consumer) => {
        return (
          <AppLink key={consumer.id} href={`${ROUTES.consumers}/${consumer.id}`}>
            <h2>{consumer.name}</h2>
          </AppLink>
        )
      })}
    </div>
  )
}

export default Consumers
