'use client'

import { StoreProvider } from "@store/Provider";
import { ConfigProvider, ThemeConfig } from "antd";
import { PropsWithChildren } from "react";

const themeConfig: ThemeConfig = {
    token: {
        colorPrimary: '#4D869C',   // Clay/tan
        colorBgBase: '#EEF7FF',    // Soft off-white
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