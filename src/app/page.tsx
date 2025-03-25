import AppLink from '@components/shared/AppLink'
import { ROUTES } from '@constants/routes'

export default function Home() {
  return (
    <div className="flex gap-2 ">
      {Object.entries(ROUTES).map(([key, value]) => {
        return (
          <AppLink key={key} href={value} className="uppercase">
            {key}
          </AppLink>
        )
      })}
    </div>
  )
}
