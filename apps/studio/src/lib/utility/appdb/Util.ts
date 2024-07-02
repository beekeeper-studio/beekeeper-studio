import Vue from 'vue';

export async function baseFind(name: string, options: any, cls: any) {
  const items = await Vue.prototype.$util.send(`appdb/${name}/find`, { options });
  return items.map((item) => {
    const newItem = new cls();
    return Object.assign(newItem, item); 
  })
}

export async function baseFindOne(name: string, options: any, cls: any) {
  const item = await Vue.prototype.$util.send(`appdb/${name}/findOne`, { options });
  const newItem = new cls();
  return Object.assign(newItem, item);
}
