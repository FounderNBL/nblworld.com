import {test,expect} from "@playwright/test";

test("NBL World is an independent shop without NBL customer login",async({page})=>{
  await page.goto("/");
  await expect(page).toHaveTitle(/NBL World Shop/);
  await expect(page.getByRole("heading",{name:"Welcome to the NBL World Shop."})).toBeVisible();
  await expect(page.getByRole("link",{name:"Shop NBL Clothing"})).toHaveAttribute("href","https://new-beansland.myshopify.com");
  await expect(page.getByRole("link",{name:"Shop NBL Books"})).toHaveAttribute("href","https://books.newbeansland.org/");
  await expect(page.getByRole("link",{name:/Enter New Beansland/i})).toHaveAttribute("href","https://newbeansland.org/");
  await expect(page.locator("script[src*='clerk']")).toHaveCount(0);
  await expect(page.locator("[data-nblu-checkout]")).toHaveCount(0);
  await expect(page.locator(".hero img")).toBeVisible();
});

test("sales-only layout stays readable on mobile",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await expect(page.getByRole("link",{name:"Shop NBL Clothing"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Shop NBL Books"})).toBeVisible();
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
  expect(noOverflow).toBe(true);
});

for(const [oldRoute,to] of [
  ["/chat.html","https://newbeansland.org/chat.html"],
  ["/university.html","https://newbeansland.org/campus.html"],
  ["/voice-lab.html","https://newbeansland.org/voice-lab.html"]
]){
  test(oldRoute+" hands off to newbeansland.org without local Clerk",async({request})=>{
    const response=await request.get(oldRoute);
    expect(response.ok()).toBe(true);
    const html=await response.text();
    expect(html).toContain('content="0;url='+to+'"');
    expect(html).toContain('location.replace("'+to+'")');
    expect(html).not.toMatch(/clerk\.browser|data-nblu-checkout|data-chat-app|data-signin/);
  });
}
