import Viewer from './viewer/viewer';
import type { Metadata } from 'next';

const title = 'PHP AST Viewer';
const description =
  'The PHP AST Viewer is a tool for viewing the Abstract Syntax Tree of PHP code. By visualizing the structure, it helps developers gain a deeper understanding of the code, thus improving code quality and maintenance efficiency.';
const keywords = 'PHP, Viewer, Inspector, AST, PHP, AST';
const author = 'Yilun Sun';
const websiteUrl = 'https://php-ast-viewer.com';
const imageUrl =
  'https://github-production-user-asset-6210df.s3.amazonaws.com/43896664/331158521-e1568e1d-2da1-4af7-955d-276d413d3338.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20240525%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20240525T144656Z&X-Amz-Expires=300&X-Amz-Signature=70807e84abed2a7fd533360b974201e3f99bed4462a79d5809ee2e40c422f6b9&X-Amz-SignedHeaders=host&actor_id=101971&key_id=0&repo_id=792947960';

export const metadata: Metadata = {
  title: title,
  description: description,
  keywords: keywords,
  authors: [{ name: author }],
  openGraph: {
    title,
    description,
    url: websiteUrl,
    authors: [author],
    images: [imageUrl],
  },
  twitter: {
    title,
    description,
    images: [imageUrl],
    card: 'summary_large_image',
  },
};

// `app/page.tsx` is the UI for the `/` URL
export default function Page() {
  return <Viewer />;
}
