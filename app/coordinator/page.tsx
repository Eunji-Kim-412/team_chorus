import { redirect } from "next/navigation";

// 케어 코디네이터는 "메시지 에이전트"(/messages)로 통합되었습니다.
export default function CoordinatorRedirect() {
  redirect("/messages");
}
