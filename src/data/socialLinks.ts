export interface SocialLink {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
}

export const socialLinks: SocialLink[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    href: "https://wa.me/917041293231",
    enabled: true,
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/siddm_18?jplx=ZDNlZDc0MzIxNw==",
    enabled: true,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/siddharth-girase-971509374/",
    enabled: true,
  },
];
