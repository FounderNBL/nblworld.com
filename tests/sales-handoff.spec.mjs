import {test,expect} from "@playwright/test";

test("NBL World opens on entertainment and preserves independent shop routes",async({page})=>{
  await page.goto("/");
  await expect(page).toHaveTitle(/NBL World.*Film, Music/);
  await expect(page.getByRole("heading",{name:"NBL WORLD",level:1})).toBeVisible();
  await expect(page.getByText("More than a platform. A destination.")).toBeVisible();
  await expect(page.getByRole("link",{name:"Explore NBL World"})).toHaveAttribute("href","#discover");
  await expect(page.getByRole("heading",{name:"Take a look around."})).toBeVisible();
  await expect(page.locator('video source[src*="NBL_Studio_Presents_The_City_Trailer.mp4"]')).toHaveCount(1);
  await expect(page.locator("video")).not.toHaveAttribute("autoplay",/./);
  await expect(page.getByRole("link",{name:"Explore NBL music"})).toHaveAttribute("href","https://newbeansland.org/studio/");
  await expect(page.getByRole("link",{name:"Shop clothing"})).toHaveAttribute("href","https://new-beansland.myshopify.com");
  await expect(page.getByRole("link",{name:"Explore books"})).toHaveAttribute("href","https://books.newbeansland.org/");
  await expect(page.getByRole("link",{name:"Enter New Beansland"}).first()).toHaveAttribute("href","https://newbeansland.org/");
  await expect(page.locator("script[src*='clerk']")).toHaveCount(0);
  await expect(page.locator("[data-nblu-checkout]")).toHaveCount(0);
  await expect(page.locator(".hero-art img")).toBeVisible();
});

test("Project enquiries and public agreement overview are available without checkout",async({page})=>{
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Want to make something with NBL?"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Ask about a project"})).toHaveAttribute("href",/^mailto:founder@newbeansland\.org\?subject=/);
  await expect(page.getByRole("link",{name:"Introduce your talent"})).toHaveAttribute("href",/^mailto:founder@newbeansland\.org\?subject=/);
  await page.getByText("What about contracts, music rights and ownership?").click();
  await expect(page.getByText(/not a contract or an offer of a specific rate/i)).toBeVisible();
  await expect(page.locator("[data-nblu-checkout]")).toHaveCount(0);
});

test("explore-first layout and retained shops stay readable on mobile",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await expect(page.getByRole("link",{name:"Explore NBL World"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Shop clothing"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Explore books"})).toBeVisible();
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
  expect(noOverflow).toBe(true);
});

for(const [oldRoute,to] of [
  ["/chat.html","https://newbeansland.org/messenger/"],
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
