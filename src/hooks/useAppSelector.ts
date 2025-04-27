import { TypedUseSelectorHook, useSelector } from 'react-redux'
import { RootState } from '@store/main'

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
