// const ONBOARDING_DATA = require("../../../assets/OnboardingResponseTruncated.json")

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchOnboardingData(): Promise<any> {
  await wait(2000)
  // return Promise.resolve(ONBOARDING_DATA)
}

export async function postUserInput(_payload: any): Promise<{ status: number }> {
  await wait(2000)
  return { status: 200 }
}
