import React, { memo } from 'react'; // v18.2.0
import { Box, Typography, useTheme, Stack, Link } from '@mui/material'; // v5.14.0

const Footer: React.FC = memo(() => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Help Center', href: '/help' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        width: '100%',
        backgroundColor: theme.palette.background.paper,
        borderTop: `1px solid ${theme.palette.divider}`,
        padding: theme.spacing(2, 3),
        position: 'relative',
        zIndex: theme.zIndex.appBar,
      }}
      role="contentinfo"
      aria-label="Site footer"
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 2, sm: 3 }}
        sx={{
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Copyright Section */}
        <Typography
          variant="body2"
          color="text.secondary"
          align={{ xs: 'center', sm: 'left' }}
          sx={{ order: { xs: 2, sm: 1 } }}
        >
          © {currentYear} Task Management System. All rights reserved.
        </Typography>

        {/* Navigation Links */}
        <Stack
          direction="row"
          spacing={2}
          sx={{
            order: { xs: 1, sm: 2 },
            flexWrap: 'wrap',
            justifyContent: { xs: 'center', sm: 'flex-end' },
            gap: theme.spacing(2),
          }}
          component="nav"
          aria-label="Footer navigation"
        >
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              underline="none"
              sx={{
                color: theme.palette.text.secondary,
                transition: 'color 0.2s ease',
                fontSize: '0.875rem',
                '&:hover': {
                  color: theme.palette.primary.main,
                },
                '&:focus': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: '2px',
                },
              }}
              onClick={(e) => {
                // Prevent default only if it's a client-side route
                if (link.href.startsWith('/')) {
                  e.preventDefault();
                  // Add your routing logic here
                }
              }}
            >
              {link.label}
            </Link>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
});

Footer.displayName = 'Footer';

export { Footer };