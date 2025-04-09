import { useAppDispatch } from '@hooks/useAppDispatch';
import useLocalStorage from '@hooks/useLocalStorage';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

type RegistrationValues = {
    phoneNumber: string;
    rememberMe: boolean;
};

export const useRegistration = (registrationType: string) => {
    const dispatch = useAppDispatch()
    const router = useRouter()

    const [, setIsLoggedIn] = useLocalStorage('isLoggedIn', false)

    return useCallback(
        async (values: RegistrationValues) => {
            console.log({ values });

            // // // Create a payload that matches what the API expects
            // const apiPayload = {
            //     email: '', // Empty for phone registration
            //     password: '', // Empty for phone registration
            //     rememberMe: values.rememberMe
            // };

            // // For now, we'll use a type assertion to bypass the type checking
            // // In a real implementation, you would need to update the API types
            // const registrationAction = await dispatch(registerThunk({
            //     loginType: 'phoneNumber',
            //     values: apiPayload as any
            // }))

            // if (isRejectedAction(registrationAction)) return

            // setIsLoggedIn(true)
            // router.push(ROUTES.home)
        },
        [dispatch, registrationType, setIsLoggedIn, router]
    )
} 