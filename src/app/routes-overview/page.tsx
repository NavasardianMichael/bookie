import AppLink from "@components/shared/AppLink"
import { ROUTES } from "@constants/routes"
import { OVERVIEW_ROUTES } from "@interfaces/header"

const RoutesOverview = () => {
  return (
    <nav className="md:flex gap-4">
      {OVERVIEW_ROUTES.map(({ label, name }) => {
        return (
          <AppLink key={ROUTES[name]} href={ROUTES[name]} className="capitalize hover:text-blue-600 transition-colors">
            {label}
          </AppLink>
        )
      })}
    </nav>
  )
}

export default RoutesOverview
