import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Titillium Web', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				heading: ['Titillium Web', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				body: ['Titillium Web', 'ui-sans-serif', 'system-ui', 'sans-serif']
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				aqi: {
					good: 'hsl(var(--aqi-good))',
					moderate: 'hsl(var(--aqi-moderate))',
					'unhealthy-sensitive': 'hsl(var(--aqi-unhealthy-sensitive))',
					unhealthy: 'hsl(var(--aqi-unhealthy))',
					'very-unhealthy': 'hsl(var(--aqi-very-unhealthy))',
					hazardous: 'hsl(var(--aqi-hazardous))'
				},
				// Design System Colors
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				error: {
					DEFAULT: 'hsl(var(--error))',
					foreground: 'hsl(var(--error-foreground))'
				}
			},
			backgroundImage: {
				'gradient-aqi': 'var(--gradient-aqi)',
				'gradient-card': 'var(--gradient-card)',
				'gradient-primary': 'var(--gradient-primary)'
			},
			boxShadow: {
				card: 'var(--shadow-card)',
				glow: 'var(--shadow-glow)',
				glass: 'var(--shadow-glass)',
				'glass-hover': 'var(--shadow-glass-hover)'
			},
			transitionTimingFunction: {
				smooth: 'var(--transition-smooth)',
				bounce: 'var(--transition-bounce)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				// Design system specific radius
				'ds-small': '6px',
				'ds-medium': '12px',
				'ds-large': '20px'
			},
			spacing: {
				'navbar': 'var(--navbar-height)',
				'sidebar': 'var(--sidebar-width)',
				'card': 'var(--card-padding)',
				'page': 'var(--page-padding)',
				'section': 'var(--section-padding)',
				'grid-gap': 'var(--grid-gutter)',
				'card-gap': 'var(--card-spacing)'
			},
			fontSize: {
				'heading-lg': '24px',
				'heading-md': '18px',
				'body-md': '14px',
				'body-sm': '12px'
			},
			fontWeight: {
				'heading': '600',
				'body': '400'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
