import fs from 'fs'
import path from 'path'

/**
 * process.env가 빈 문자열로 덮어씌워진 경우에도
 * .env.local에서 직접 키를 읽어오는 유틸리티
 */
export function getApiKey(keyName: string): string {
  const envVal = process.env[keyName]
  if (envVal && envVal.length > 0) return envVal

  // fallback: .env.local 파일 직접 파싱
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    const content = fs.readFileSync(envPath, 'utf-8')
    const match = content.match(new RegExp(`^${keyName}=(.+)$`, 'm'))
    return match ? match[1].trim() : ''
  } catch {
    return ''
  }
}
