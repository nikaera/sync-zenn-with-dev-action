export async function wait(milliseconds: number): Promise<string> {
  return await new Promise<string>(resolve => {
    if (isNaN(milliseconds)) {
      throw new Error('milliseconds not a number')
    }

    setTimeout(() => {
      resolve('done!')
    }, milliseconds)
  })
}
