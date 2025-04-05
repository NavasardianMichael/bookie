'use client'

import { FORM_DEFAULT_VALIDATION_MESSAGES, FORM_ITEM_REQUIRED_RULE_SET } from '@constants/auth/form';
import { LOGIN_FORM_INITIAL_VALUES, LOGIN_TYPES } from '@constants/auth/login';
import { useLogin } from '@hooks/auth/useLogin';
import { Button, Checkbox, Form, Input } from 'antd';
import { useFormik } from 'formik';

type FieldType = {
    username?: string;
    password?: string;
    rememberMe?: string;
};

const LoginForm: React.FC = () => {
    const login = useLogin(LOGIN_TYPES.internal)

    const formik = useFormik({
        initialValues: LOGIN_FORM_INITIAL_VALUES,
        onSubmit: login,
        // validateOnChange: false,
    })

    return (
        <Form
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 20 }}
            initialValues={{ rememberMe: true }}
            autoComplete="off"
            validateMessages={FORM_DEFAULT_VALIDATION_MESSAGES}
            onSubmitCapture={formik.handleSubmit}
        >
            <Form.Item<FieldType>
                label="Username"
                name="username"
                rules={FORM_ITEM_REQUIRED_RULE_SET}
            >
                <Input name='username' value={formik.values.email} onChange={formik.handleChange} />
            </Form.Item>

            <Form.Item<FieldType>
                label="Password"
                name="password"
                rules={FORM_ITEM_REQUIRED_RULE_SET}
            >
                <Input.Password name='password' value={formik.values.password} onChange={formik.handleChange} />
            </Form.Item>

            <Form.Item<FieldType> name="rememberMe" valuePropName="checked" label={null}>
                <Checkbox name='rememberMe' value={formik.values.rememberMe} onChange={formik.handleChange}>Remember me</Checkbox>
            </Form.Item>

            <Form.Item label={null}>
                <Button type="primary" variant="solid" htmlType="submit">
                    Submit
                </Button>
            </Form.Item>
        </Form>
    )
};

export default LoginForm;