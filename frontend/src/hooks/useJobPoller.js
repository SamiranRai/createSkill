import { useEffect, useRef } from 'react'
import { getJob } from '../api/jobs.api'

const POLL_MS = 2500
const MAX_POLL_MS = 5 * 60 * 1000

const useJobPoller = ({ jobId, onUpdate, onComplete, onError }) => {
  const onUpdateRef = useRef(onUpdate)
  const onCompleteRef = useRef(onComplete)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onUpdateRef.current = onUpdate
    onCompleteRef.current = onComplete
    onErrorRef.current = onError
  }, [onUpdate, onComplete, onError])

  useEffect(() => {
    if (!jobId) return undefined

    let timeoutId = null
    let cancelled = false
    let inFlight = false
    const startedAt = Date.now()

    const stop = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const scheduleNext = () => {
      if (cancelled) return
      timeoutId = setTimeout(poll, POLL_MS)
    }

    const poll = async () => {
      if (cancelled || inFlight) return

      if (Date.now() - startedAt >= MAX_POLL_MS) {
        onErrorRef.current?.('Polling timed out. Please try again.')
        stop()
        return
      }

      inFlight = true

      try {
        const job = await getJob(jobId)
        onUpdateRef.current?.(job)

        if (job.status === 'complete') {
          onCompleteRef.current?.(job)
          stop()
          return
        } else if (job.status === 'failed') {
          onErrorRef.current?.(job.error?.message)
          stop()
          return
        }
      } catch (err) {
        console.error('[useJobPoller] Polling error', err)
      } finally {
        inFlight = false
      }

      scheduleNext()
    }

    poll()

    return () => {
      cancelled = true
      stop()
    }
  }, [jobId])
}

export default useJobPoller
