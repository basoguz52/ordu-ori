import { PostListPage } from "./posts/PostListPage";

export default function Haberler() {
  return (
    <PostListPage
      kind="news"
      title="Haberler"
      description="Ordu Oryantiring haberleri."
      basePath="/haberler"
    />
  );
}
