import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const postJobPath = resolve('platform/src/pages/PostJob.jsx')
const jobDetailPath = resolve('platform/src/pages/JobDetail.jsx')

const postJobSource = readFileSync(postJobPath, 'utf-8')
const jobDetailSource = readFileSync(jobDetailPath, 'utf-8')

const pairs = [
  { file: 'PostJob.jsx', labelText: 'Job title', id: 'job-title' },
  { file: 'PostJob.jsx', labelText: 'Description', id: 'job-description' },
  { file: 'PostJob.jsx', labelText: 'Location', id: 'job-location' },
  { file: 'PostJob.jsx', labelText: 'Preferred date', id: 'job-date' },
  { file: 'PostJob.jsx', labelText: 'Time of day', id: 'job-time' },
  { file: 'PostJob.jsx', labelText: 'Approximate budget', id: 'job-budget' },
  { file: 'JobDetail.jsx', labelText: 'Comment', id: 'review-comment' }
]

describe('platform label-control pairs (jobs)', () => {
  for (const { file, labelText, id } of pairs) {
    const source = file === 'PostJob.jsx' ? postJobSource : jobDetailSource
    it(`has label with text "${labelText}" and htmlFor="${id}" on same element (${file})`, () => {
      const escapedText = labelText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const labelRegex = new RegExp(`<label[^>]*htmlFor="${id}"[^>]*>[\\s\\S]*?${escapedText}[\\s\\S]*?</label>`)
      expect(source).toMatch(labelRegex)
    })
    it(`has control with id="${id}" (${file}: ${labelText})`, () => {
      expect(source).toContain(`id="${id}"`)
    })
  }
})
