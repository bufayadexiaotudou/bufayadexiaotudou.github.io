$out = 'C:\Users\l2026\Documents\Default Project\cangxi1949_1953\audit'
$hits = Import-Csv -LiteralPath "$out\audit_hits_raw.csv" -Encoding UTF8
$strong = @('枪决','枪毙','处决','正法','伏法','极刑','判处死刑','判死','处死','击毙','法办','判刑','逮捕','拘捕','在押','抓获','拿获','镇压','公审','宣判','被杀害','被杀','死刑')
$grpD = @('会议','大会','群众大会','农民大会','农代会','村民','会上','发言','反对','顶撞','争辩','争执','抗拒','抵抗','不服','拒绝','辱骂','煽动','造谣')
$dPages = @{}
foreach ($r in $hits) { if ($grpD -contains $r.keyword) { $dPages["$($r.book)|$($r.page)"] = 1 } }
$cross = @()
foreach ($r in $hits) {
  if (($strong -contains $r.keyword) -and $dPages.ContainsKey("$($r.book)|$($r.page)")) {
    $cross += $r
  }
}
$cross | Sort-Object book, page | ForEach-Object { "{0}|{1}|{2}|{3}|{4}" -f $_.book, $_.page, $_.keyword, $_.ctx_before, $_.ctx_after } |
  Set-Content -LiteralPath "$out\audit_review_meeting.txt" -Encoding UTF8
Write-Output "strong_x_meeting=$($cross.Count)"
