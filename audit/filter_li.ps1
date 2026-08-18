$out = 'C:\Users\l2026\Documents\Default Project\cangxi1949_1953\audit'
$rows = Import-Csv -LiteralPath "$out\audit_hits_raw.csv" -Encoding UTF8
$liRaw = Import-Csv -LiteralPath "$out\surname_li_raw.csv" -Encoding UTF8

# 聚合：raw_name -> count, books, pages
$agg = @{}
foreach ($r in $liRaw) {
  $raw = $r.raw_name
  if (-not $agg.ContainsKey($raw)) {
    $agg[$raw] = @{ count = 0; books = @{}; pages = New-Object System.Collections.Generic.List[string]; ctx = $r.ctx_after; sample_ctx = $r.ctx_after }
  }
  $agg[$raw].count++
  if (-not $agg[$raw].books.ContainsKey($r.book)) { $agg[$raw].books[$r.book] = 1 }
  if ($agg[$raw].pages.Count -lt 3 -and -not $agg[$raw].pages.Contains($r.page)) { $agg[$raw].pages.Add($r.page) }
}

$disp = @('枪决','枪毙','处决','正法','死刑','判刑','徒刑','劳改','管制','逮捕','拘捕','在押','抓获','拿获','击毙','镇压','法办','处死','被杀','杀害','批斗','清算','土改','地主','恶霸','匪','反革命','镇反','公审','宣判','自新','投案','冤案','错案','平反','复查','调训','乡保长')
$dispPages = @{}
foreach ($r in $rows) {
  if ($disp -contains $r.keyword) {
    $dispPages["$($r.book)|$($r.page)"] = 1
  }
}
$liFlag = @{}
foreach ($r in $liRaw) {
  if ($dispPages.ContainsKey("$($r.book)|$($r.page)")) {
    if ($liFlag.ContainsKey($r.raw_name)) { $liFlag[$r.raw_name]++ } else { $liFlag[$r.raw_name] = 1 }
  }
}

$res = @()
foreach ($raw in $agg.Keys) {
  if ($raw.Length -lt 2) { continue }
  if ($raw -match '^李[姓氏子树花谷园堂公祠家门]') { continue }
  $flag = 0
  if ($liFlag.ContainsKey($raw)) { $flag = $liFlag[$raw] }
  $info = $agg[$raw]
  $res += [pscustomobject]@{
    raw_name = $raw
    count = $info.count
    books = ($info.books.Keys -join ';')
    pages = ($info.pages -join ';')
    disp_ctx = $flag
    sample = $info.sample_ctx
  }
}
$res | Sort-Object -Property @{Expression='disp_ctx';Descending=$true}, @{Expression='count';Descending=$true} | Export-Csv -LiteralPath "$out\audit_li_personlike.csv" -NoTypeInformation -Encoding UTF8
$flagged = ($res | Where-Object { $_.disp_ctx -gt 0 } | Measure-Object).Count
Write-Output "personlike=$($res.Count) disp_flagged=$flagged"
