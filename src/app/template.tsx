import { StoreProvider } from "@store/Provider";
import { ConfigProvider } from "antd";
import { PropsWithChildren } from "react";

const themeConfig = {
    token: {
        colorPrimary: '#add8e6',
    },
}

export default function Template({ children }: PropsWithChildren) {
    return (
        <ConfigProvider theme={themeConfig}>
            <StoreProvider>
                {children}
            </StoreProvider>
        </ConfigProvider>
    )
}