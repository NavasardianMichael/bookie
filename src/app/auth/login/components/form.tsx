'use client'

import { LOGIN_FORM_INITIAL_VALUES, LOGIN_TYPES } from '@constants/auth/login';
import { REG_EXPS } from '@constants/regexps';
import { useLogin } from '@hooks/auth/useLogin';
import type { FormProps } from 'antd';
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
        enableReinitialize: true,
        validateOnChange: false,
    })

    return (
        <Form
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 20 }}
            initialValues={{ rememberMe: true }}
            autoComplete="off"
        >
            <Form.Item<FieldType>
                label="Username"
                name="username"
                rules={[{ required: true, message: 'Please input your username!', pattern: REG_EXPS.email }]}
            >
                <Input name='username' value={formik.values.email} onChange={formik.handleChange} />
            </Form.Item>

            <Form.Item<FieldType>
                label="Password"
                name="password"
                rules={[{ required: true, message: 'Please input your password!' }]}
            >
                <Input.Password name='password' value={formik.values.password} onChange={formik.handleChange} />
            </Form.Item>

            <Form.Item<FieldType> name="rememberMe" valuePropName="checked" label={null}>
                <Checkbox name='rememberMe' value={formik.values.rememberMe} onChange={formik.handleChange}>Remember me</Checkbox>
            </Form.Item>

            <Form.Item label={null}>
                <Button type="primary" color='default' variant="solid" htmlType="submit">
                    Submit
                </Button>
            </Form.Item>
        </Form>
    )
};

export default LoginForm;