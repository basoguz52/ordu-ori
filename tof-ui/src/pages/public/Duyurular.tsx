import { PostListPage } from "./posts/PostListPage";

export default function Duyurular() {
  return (
    <PostListPage
      kind="announcement"
      title="Duyurular"
      description="Ordu Oryantiring güncel duyuruları."
      basePath="/duyurular"
    />
  );
}
