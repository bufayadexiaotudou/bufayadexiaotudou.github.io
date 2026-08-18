$out = 'C:\Users\l2026\Documents\Default Project\cangxi1949_1953\audit'
$hits = Import-Csv -LiteralPath "$out\audit_hits_raw.csv" -Encoding UTF8

# 1) 无姓名处置/反向检索关键词
$nameless = @('一批','若干','罪大恶极','首恶','予以枪决','外逃','潜逃','逃跑','逃往','出走','失踪','下落不明','不明下落','畏罪','自杀','投井','处死')
$rows = $hits | Where-Object { $nameless -contains $_.keyword } | Sort-Object book, page
$rows | ForEach-Object { "{0}|{1}|{2}|{3}|{4}" -f $_.book, $_.page, $_.keyword, $_.ctx_before, $_.ctx_after } |
  Set-Content -LiteralPath "$out\audit_review_nameless.txt" -Encoding UTF8
Write-Output "nameless=$($rows.Count)"

# 2) 身份词语境中的剩余李姓候选（排除已在处置语境页面的）
$liRaw = Import-Csv -LiteralPath "$out\surname_li_raw.csv" -Encoding UTF8
$dispPages = @{}
foreach ($r in $hits) {
  if (@('枪决','枪毙','处决','正法','死刑','判刑','徒刑','劳改','管制','逮捕','拘捕','在押','抓获','拿获','击毙','镇压','法办','处死','被杀','杀害','批斗','清算','土改','地主','恶霸','匪','反革命','镇反','公审','宣判','自新','投案','冤案','错案','平反','复查','调训','乡保长') -contains $r.keyword) {
    $dispPages["$($r.book)|$($r.page)"] = 1
  }
}
$identity = @('乡长','保长','甲长','地主','恶霸','匪首','特务','参议员','县长','区长','团总','联保','候选人','委员','主任','队长','会长','校长','局长','科长','处长','书记','代表','参谋','营长','连长','排长','团练','自卫')
$kept = @()
foreach ($r in $liRaw) {
  if ($dispPages.ContainsKey("$($r.book)|$($r.page)")) { continue }
  $ctx = $r.ctx_before + $r.ctx_after
  $hit = $false
  foreach ($w in $identity) { if ($ctx.Contains($w)) { $hit = $true; break } }
  if ($hit) {
    $kept += [pscustomobject]@{ book = $r.book; page = $r.page; raw = $r.raw_name; ctx = $ctx }
  }
}
$kept | Sort-Object book, page | ForEach-Object { "{0}|{1}|{2}|{3}" -f $_.book, $_.page, $_.raw, $_.ctx } |
  Set-Content -LiteralPath "$out\audit_li_identity.txt" -Encoding UTF8
Write-Output "li_identity=$($kept.Count)"
