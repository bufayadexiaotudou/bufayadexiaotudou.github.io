$out = 'C:\Users\l2026\Documents\Default Project\cangxi1949_1953\audit'
$liRaw = Import-Csv -LiteralPath "$out\surname_li_raw.csv" -Encoding UTF8
$targets = @('李阳川','李方田','李德荣','李正华','李子义','李有为','李有寿','李有明','李嘉兴','李清磁','李福田','李万明','李万翔','李扬波','李淑贞','李玉保','李应贞','李成','李浚泉','李剑金','李子君','李海波','李钟芹','李灵椿','李梦林')
$kept = @()
foreach ($r in $liRaw) {
  foreach ($t in $targets) {
    if ($r.raw_name -eq $t) {
      $kept += [pscustomobject]@{ book = $r.book; page = $r.page; raw = $r.raw_name; ctx = ($r.ctx_before + $r.ctx_after) }
      break
    }
  }
}
$kept | Sort-Object raw, book, page | ForEach-Object { "{0}|{1}|{2}|{3}" -f $_.raw, $_.book, $_.page, $_.ctx } |
  Set-Content -LiteralPath "$out\audit_li_targets.txt" -Encoding UTF8
Write-Output "target_rows=$($kept.Count)"

$agg = @{}
foreach ($r in $liRaw) {
  if (-not $agg.ContainsKey($r.raw_name)) { $agg[$r.raw_name] = 0 }
  $agg[$r.raw_name]++
}
$agg.GetEnumerator() | Where-Object { $_.Key.Length -ge 3 -and $_.Value -ge 5 } | Sort-Object Value -Descending |
  ForEach-Object { "{0}|{1}" -f $_.Key, $_.Value } | Set-Content -LiteralPath "$out\audit_li_top.txt" -Encoding UTF8
$topN = ($agg.GetEnumerator() | Where-Object { $_.Key.Length -ge 3 -and $_.Value -ge 5 } | Measure-Object).Count
Write-Output "top_names=$topN"
