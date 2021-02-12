const ctx: Worker = self as any;


ctx.addEventListener("message", (event) => {
  console.log("Hello Worker!!", event)
  ctx.postMessage({ hello: 'world' });
})