import { ROUTES } from '@constants/routes'
import AppLink from '@components/ui/AppLink'

export default async function NotFound() {
  return (
    <div className='text-center flex flex-col justify-center items-center w-full'>
      <h1 className='text-2xl font-bold'>Not Found</h1>
      <p>Could not find requested resource</p>
      <p>
        To{' '}
        <AppLink href={ROUTES.home} className='uppercase'>
          Home
        </AppLink>
      </p>
    </div>
  )
}
