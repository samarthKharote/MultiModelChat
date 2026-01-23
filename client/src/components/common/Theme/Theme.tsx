import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';

import { darkTheme } from '@/theme';

export interface ThemeProps {
    /** children to be rendered */
    children?: React.ReactNode;
}

const theme = createTheme(darkTheme);

export const Theme = (props: ThemeProps) => {
    const { children } = props;

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
};
