import Link from 'next/link'
import { ROUTES } from '@constants/routes'

export default function Home() {
  return (
    <div className="flex gap-2 ">
      {Object.entries(ROUTES).map(([key, value]) => {
        return (
          <Link key={key} href={value} className="text-gray-700 uppercase underline">
            {key}
          </Link>
        )
      })}
    </div>
  )
}
