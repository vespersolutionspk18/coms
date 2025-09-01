import { HTMLAttributes } from 'react';

export default function AppLogoIcon(props: HTMLAttributes<HTMLImageElement>) {
    return (
        <img 
            src="/logo.svg" 
            alt="Logo" 
            {...props}
            style={{ 
                width: props.className?.includes('size-') ? undefined : '100%',
                height: props.className?.includes('size-') ? undefined : '100%',
                ...props.style 
            }}
        />
    );
}
