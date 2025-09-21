import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export function useClickOutside(
  target: Ref<HTMLElement | null>,
  callback: () => void
) {
  const isActive = ref(false)

  const handleClick = (event: Event) => {
    if (!isActive.value) return

    const el = target.value
    if (!el) return

    const clickTarget = event.target as Node

    // If the click is outside the target element, trigger callback
    if (!el.contains(clickTarget)) {
      callback()
    }
  }

  const activate = () => {
    isActive.value = true
  }

  const deactivate = () => {
    isActive.value = false
  }

  onMounted(() => {
    document.addEventListener('click', handleClick, true)
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleClick, true)
  })

  return {
    activate,
    deactivate
  }
}