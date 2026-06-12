export interface SignupSuccessData {
  cabradarUserId: string | null;
  needsEmailConfirm: boolean;
}

const STORAGE_KEY = "cabradar_signup_success";

export function saveSignupSuccess(data: SignupSuccessData) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function readSignupSuccess(): SignupSuccessData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SignupSuccessData;
  } catch {
    return null;
  }
}

export function clearSignupSuccess() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function signupSuccessSearchParams(data: SignupSuccessData): string {
  const params = new URLSearchParams();
  if (data.cabradarUserId) {
    params.set("id", data.cabradarUserId);
  }
  if (data.needsEmailConfirm) {
    params.set("email", "1");
  }
  return params.toString();
}

export function readSignupSuccessFromSearch(
  searchParams: URLSearchParams
): SignupSuccessData | null {
  const id = searchParams.get("id");
  const email = searchParams.get("email");
  if (!id && !email) return null;
  return {
    cabradarUserId: id,
    needsEmailConfirm: email === "1",
  };
}
