import api from "../../../api/client";

export async function testApiConnection(): Promise<void> {
  await api.get("/");
}