import {test,expect} from "@playwright/test";

const API="https://tvypdakofcrlvnwporhh.supabase.co/functions/v1/nbl-foundation-runtime";
const SIGNED_FILE="https://files.example.test/temporary-download";

async function mockCampus(page,submissions=[]){
  const requests=[];
  let failFirstUpload=false;
  let denyDownloads=false;
  await page.route("**/*",route=>route.request().url().includes("clerk.browser.js")?route.fulfill({
    contentType:"application/javascript",
    body:'window.Clerk={load:async()=>{},isSignedIn:true,session:{getToken:async()=>"student-token"},signOut:async()=>{}};'
  }):route.continue());
  await page.route("https://**/temporary-download",route=>route.fulfill({
    status:200,
    contentType:"application/pdf",
    headers:{"content-disposition":"attachment; filename=coursework.pdf"},
    body:"%PDF-1.7 test"
  }));
  await page.route(API,async route=>{
    const corsHeaders={
      "access-control-allow-origin":"*",
      "access-control-allow-headers":"authorization,content-type",
      "access-control-allow-methods":"POST,OPTIONS"
    };
    if(route.request().method()==="OPTIONS")return route.fulfill({status:204,headers:corsHeaders});
    const body=route.request().postDataJSON();
    requests.push({body,authorization:route.request().headers().authorization});
    if(body.action==="university_status"){
      return route.fulfill({headers:corsHeaders,json:{university:{
        allowed:true,role:"student",student:{student_number:"NBL-TEST"},program:{title:"Foundation"},
        courses:[{code:"APSK 101",title:"Course",current:true}],materials:[],gradebook:[],progress:{}
      }}});
    }
    if(body.action==="university_submissions")return route.fulfill({headers:corsHeaders,json:{submissions}});
    if(body.action==="university_community")return route.fulfill({headers:corsHeaders,json:{classmates:[]}});
    if(body.action==="after_grey")return route.fulfill({headers:corsHeaders,json:{ready:false}});
    if(body.action==="university_submission_download"){
      if(denyDownloads)return route.fulfill({status:403,headers:corsHeaders,json:{message:"private object path leaked"}});
      return route.fulfill({headers:corsHeaders,json:{downloadUrl:SIGNED_FILE}});
    }
    if(body.action==="university_submit_pdf"){
      if(failFirstUpload){failFirstUpload=false;return route.fulfill({status:503,headers:corsHeaders,json:{message:"Temporary intake failure"}});}
      return route.fulfill({headers:corsHeaders,json:{submission:{id:"submission-1",originalAvailable:true}}});
    }
    return route.fulfill({headers:corsHeaders,json:{}});
  });
  return {requests,failFirstUpload:()=>{failFirstUpload=true;},denyDownloads:()=>{denyDownloads=true;}};
}

test("learner receipts show review states and use authenticated short-lived file actions",async({page})=>{
  const {requests}=await mockCampus(page,[
    {id:"sub-submitted",title:"Draft",course_code:"APSK 101",submission_type:"workbook",status:"submitted",submitted_at:"2026-10-01T10:00:00Z",attachment:{filename:"draft.pdf",sizeBytes:2048,originalAvailable:true,warnings:["Page 2 could not be read"]}},
    {id:"sub-reviewed",title:"Reviewed work",course_code:"APSK 101",submission_type:"project",status:"reviewed",submitted_at:"2026-10-02T10:00:00Z",reviewedAt:"2026-10-03T10:00:00Z",safe_feedback:"Clear reasoning."},
    {id:"sub-returned",title:"Final work",course_code:"APSK 101",submission_type:"project",status:"returned",submitted_at:"2026-10-02T10:00:00Z",returnedAt:"2026-10-04T10:00:00Z",reviewedAt:"2026-10-04T09:00:00Z",safe_feedback:"Please clarify the final step.",attachment:{filename:"final.pdf",sizeBytes:1024,originalAvailable:true},returnedAvailable:true},
    {id:"sub-hold",title:"Held work",course_code:"APSK 101",submission_type:"reflection",status:"hold",submitted_at:"2026-10-02T10:00:00Z",originalAvailable:false,returnedAvailable:false}
  ]);
  await page.goto("/university.html");
  await expect(page.locator("[data-campus]")).toBeVisible();
  await expect(page.locator(".submission-receipt")).toHaveCount(4);
  const draft=page.locator(".submission").nth(0);
  await expect(draft).toContainText("Draft");
  await expect(draft).toContainText("APSK 101");
  await expect(draft).toContainText("Workbook");
  await expect(draft).toContainText("draft.pdf");
  await expect(draft).toContainText("2.0 KB");
  await expect(draft).toContainText("TEST intake note: Page 2 could not be read");
  await expect(page.locator(".submission").nth(1)).toContainText("Clear reasoning.");
  await expect(page.locator(".submission").nth(2)).toContainText("Please clarify the final step.");
  await expect(page.locator(".submission").nth(3)).toContainText("Hold");
  await expect(page.locator(".submission-download")).toHaveCount(3);
  const originalDownload=page.waitForEvent("download");
  await page.locator('[data-submission-id="sub-submitted"][data-file-kind="original"]').click();
  expect((await originalDownload).suggestedFilename()).toBe("coursework.pdf");
  const returnedDownload=page.waitForEvent("download");
  await page.locator('[data-submission-id="sub-returned"][data-file-kind="returned"]').click();
  expect((await returnedDownload).suggestedFilename()).toBe("coursework.pdf");
  const fileRequests=requests.filter(item=>item.body.action==="university_submission_download");
  expect(fileRequests.map(item=>item.body.fileType)).toEqual(["original","returned"]);
  expect(fileRequests.every(item=>item.authorization?.startsWith("Bearer "))).toBe(true);
  await expect(page.locator("body")).not.toContainText(SIGNED_FILE);
});

test("expired or wrong-account download links show a safe actionable message",async({page})=>{
  const {requests,denyDownloads}=await mockCampus(page,[{
    id:"private-submission",title:"My work",status:"submitted",originalAvailable:true
  }]);
  denyDownloads();
  await page.goto("/university.html");
  await expect(page.locator(".submission-download")).toBeVisible();
  const downloadRequest=page.waitForRequest(request=>request.url()===API&&request.postDataJSON()?.action==="university_submission_download");
  await page.locator(".submission-download").click();
  await downloadRequest;
  await expect(page.locator(".submission-download-status")).toContainText("expired or is unavailable for this account");
  await expect(page.locator(".submission-download-status")).not.toContainText("private object path");
  expect(requests.at(-1).authorization?.startsWith("Bearer ")).toBe(true);
});

test("an unchanged PDF retry reuses its key and a later submission gets a new key",async({page})=>{
  const {requests,failFirstUpload}=await mockCampus(page);
  failFirstUpload();
  await page.goto("/university.html");
  const form=page.locator("[data-coursework-form]");
  await form.locator("[data-coursework-title]").fill("Retryable PDF");
  await form.locator("[data-coursework-pdf]").setInputFiles({
    name:"retry.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.7 sample")
  });
  await form.getByRole("button",{name:"Submit to my record"}).click();
  await expect(page.locator("[data-coursework-status]")).toContainText("Temporary intake failure");
  const firstKey=requests.find(item=>item.body.action==="university_submit_pdf").body.clientSubmissionKey;
  await form.getByRole("button",{name:"Submit to my record"}).click();
  await expect(page.locator("[data-coursework-status]")).toContainText("Submission receipt confirmed");
  const uploadKeys=requests.filter(item=>item.body.action==="university_submit_pdf").map(item=>item.body.clientSubmissionKey);
  expect(uploadKeys).toEqual([firstKey,firstKey]);
  await form.locator("[data-coursework-title]").fill("Intentional new version");
  await form.locator("[data-coursework-pdf]").setInputFiles({
    name:"retry.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.7 sample")
  });
  await form.getByRole("button",{name:"Submit to my record"}).click();
  await expect.poll(()=>requests.filter(item=>item.body.action==="university_submit_pdf").length).toBe(3);
  const newKey=requests.filter(item=>item.body.action==="university_submit_pdf")[2].body.clientSubmissionKey;
  expect(newKey).not.toBe(firstKey);
});
