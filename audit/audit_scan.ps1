$ErrorActionPreference = 'Stop'
$root = 'C:\Users\l2026\Documents\Default Project\cangxi1949_1953'
$ocr = Join-Path $root 'ocr'
$out = Join-Path $root 'audit'
New-Item -ItemType Directory -Path $out -Force | Out-Null

$books = @(
  @{id='xianzhi';       file='xianzhi_norm.txt'},
  @{id='minzhengzhi_aa';file='mz_aa_norm.txt'},
  @{id='minzhengzhi_zl';file='mz_zl_norm.txt'},
  @{id='danganzhi';     file='dangan_norm.txt'},
  @{id='diminglu';      file='diminglu_norm.txt'},
  @{id='yiwengushi18';  file='yiwen_norm.txt'},
  @{id='jicheng52';     file='jicheng_norm.txt'}
)

# 关键词组（长词在前，避免短词抢先匹配）
$groupA = @('判处死刑','撤销原判','临时人民法庭','依法处理','分别处理','罪大恶极','镇压反革命','训练改造','乡保长训练','斗争大会','群众大会','土改复查','联保主任','土地改革','民主建政','废除旧乡保','副乡长','副保长','会道门','反革命','国民党','三青团','保安团','地主兼','乡保长','旧乡保','旧政权','人民法庭','不纯分子','甲长','保长','乡长','联保','旧保','旧乡','乡丁','团总','民团','地主','富农','恶霸','豪绅','土豪','兵痞','土匪','匪首','股匪','匪特','特务','首恶','枪决','枪毙','处决','正法','伏法','极刑','死刑','判死','杀害','处死','击毙','打死','歼灭','毙命','死亡','死于','被杀','被害','镇压','法办','惩办','严办','处理','定案','判刑','徒刑','劳改','管制','拘捕','拘押','逮捕','捕获','抓获','拿获','诱捕','押解','关押','在押','自新','投案','平反','冤案','错案','误判','复查','斗争','匪','杀','清匪','剿匪','肃特','镇反','反霸','减租','退押','征粮','土改','法院','公安','看守所','监狱','公审','宣判','会议','大会','农民大会','农代会','村民','会上','发言','反对','不满','顶撞','争辩','争执','抗拒','抵抗','不服','拒绝','破坏','辱骂','煽动','造谣')
# 分组映射（关键词 -> 组）
$grpMap = @{}
foreach ($k in $groupA) { $grpMap[$k] = 'A' }
$allKws = $groupA

# 额外专项词
$extraKws = @('543','五百四十三','名册','名单','花名册','审查表','处理决定','调训','训练','学习班','旧保甲','调县学习','调县','审查')
$grpMapExtra = @{}
foreach ($k in $extraKws) { $grpMapExtra[$k] = 'X' }

# 深度专项（543 乡保长）
$deepKws = @('调训','乡保长','联保','旧保甲','废除旧乡保','543','五百四十三','调县学习','训练','乡保人员','旧乡保人员','旧乡保政权')

function CsvEscape($s) {
  if ($null -eq $s) { return '""' }
  $s = $s -replace '[\r\n\t]', ' '
  return '"' + ($s -replace '"', '""') + '"'
}

$hitsFile = Join-Path $out 'audit_hits_raw.csv'
$liRawFile = Join-Path $out 'surname_li_raw.csv'
$liNamesFile = Join-Path $out 'surname_li_names.csv'
$pagesFile = Join-Path $out 'audit_pages_checked.csv'
$reviewFile = Join-Path $out 'audit_pages_reviewed.csv'
$uncertainFile = Join-Path $out 'audit_uncertain.csv'
$deepFile = Join-Path $out 'audit_hits543.csv'
$summaryFile = Join-Path $out 'audit_summary.txt'

# 重建文件（带 BOM，Excel 可读）
$enc = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($hitsFile, "book,group,keyword,page,ctx_before,ctx_after`r`n", $enc)
[System.IO.File]::WriteAllText($liRawFile, "book,page,raw_name,ctx_before,ctx_after,possible_person,possible_period`r`n", $enc)
[System.IO.File]::WriteAllText($liNamesFile, "raw_name,count,books,pages_first3,sample_ctx`r`n", $enc)
[System.IO.File]::WriteAllText($pagesFile, "book,page,text_len,grpA,grpB,grpC,grpD,grpX,has_li`r`n", $enc)
[System.IO.File]::WriteAllText($reviewFile, "book,total_pages,empty_pages,hit_pages,status,notes`r`n", $enc)
[System.IO.File]::WriteAllText($uncertainFile, "book,page,type,detail`r`n", $enc)
[System.IO.File]::WriteAllText($deepFile, "book,page,keyword,ctx_before,ctx_after`r`n", $enc)

$liNameAgg = @{}   # raw -> [count, books, pages[], sampleCtx]
$liRe = New-Object System.Text.RegularExpressions.Regex('李[\p{IsCJKUnifiedIdeographs}]{0,3}')
$cjk = '\p{IsCJKUnifiedIdeographs}'

$summary = New-Object System.Text.StringBuilder

foreach ($b in $books) {
  $path = Join-Path $ocr $b.file
  $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  $parts = [regex]::Split($text, '(?=<<[^>]+>>)') | Where-Object { $_ -match '^<<' }
  $total = $parts.Count
  $emptyCount = 0
  $hitAny = 0
  $grpHit = @{A=0;B=0;C=0;D=0;X=0}
  $pageRows = New-Object System.Collections.Generic.List[string]

  foreach ($part in $parts) {
    $m = [regex]::Match($part, '^<<([^>]+)>>')
    $pgid = $m.Groups[1].Value
    $content = $part.Substring($m.Length)
    $tl = $content.Length
    $flags = @{A=0;B=0;C=0;D=0;X=0;li=0}
    $hitThisPage = $false

    if ($tl -lt 15) {
      $emptyCount++
      [System.IO.File]::AppendAllText($uncertainFile, "$($b.id),$pgid,empty_page,text_len=$tl`r`n", $enc)
    }

    # 主关键词组（单 regex alternation）
    $pat = ($groupA | Sort-Object -Property { $_.Length } -Descending | ForEach-Object { [regex]::Escape($_) }) -join '|'
    $re = [regex]::new($pat)
    $seen = @{}
    foreach ($mm in $re.Matches($content)) {
      $kw = $mm.Value
      $g = $grpMap[$kw]
      if ($null -eq $g) { continue }
      $flags[$g] = 1
      $key = "$pgid|$kw"
      if ($seen.ContainsKey($key)) { continue }
      $seen[$key] = 1
      $i = $mm.Index
      $start = [Math]::Max(0, $i - 25)
      $before = $content.Substring($start, $i - $start)
      $alen = [Math]::Min(140, $content.Length - ($i + $mm.Length))
      $after = $content.Substring($i + $mm.Length, $alen)
      [System.IO.File]::AppendAllText($hitsFile, "$($b.id),$g,$kw,$pgid," + (CsvEscape $before) + "," + (CsvEscape $after) + "`r`n", $enc)
      $hitThisPage = $true
    }

    # 额外专项词
    if ($extraKws.Count -gt 0) {
      $patX = ($extraKws | Sort-Object -Property { $_.Length } -Descending | ForEach-Object { [regex]::Escape($_) }) -join '|'
      $reX = [regex]::new($patX)
      $seenX = @{}
      foreach ($mm in $reX.Matches($content)) {
        $kw = $mm.Value
        $flags['X'] = 1
        $key = "$pgid|$kw"
        if ($seenX.ContainsKey($key)) { continue }
        $seenX[$key] = 1
        $i = $mm.Index
        $start = [Math]::Max(0, $i - 25)
        $before = $content.Substring($start, $i - $start)
        $alen = [Math]::Min(140, $content.Length - ($i + $mm.Length))
        $after = $content.Substring($i + $mm.Length, $alen)
        [System.IO.File]::AppendAllText($hitsFile, "$($b.id),X,$kw,$pgid," + (CsvEscape $before) + "," + (CsvEscape $after) + "`r`n", $enc)
        $hitThisPage = $true
      }
    }

    # 深度专项（543 乡保长）—— 大上下文
    if ($deepKws.Count -gt 0) {
      $patD = ($deepKws | Sort-Object -Property { $_.Length } -Descending | ForEach-Object { [regex]::Escape($_) }) -join '|'
      $reD = [regex]::new($patD)
      $seenD = @{}
      foreach ($mm in $reD.Matches($content)) {
        $kw = $mm.Value
        $key = "$pgid|$kw"
        if ($seenD.ContainsKey($key)) { continue }
        $seenD[$key] = 1
        $i = $mm.Index
        $start = [Math]::Max(0, $i - 60)
        $before = $content.Substring($start, $i - $start)
        $alen = [Math]::Min(400, $content.Length - ($i + $mm.Length))
        $after = $content.Substring($i + $mm.Length, $alen)
        [System.IO.File]::AppendAllText($deepFile, "$($b.id),$pgid,$kw," + (CsvEscape $before) + "," + (CsvEscape $after) + "`r`n", $enc)
      }
    }

    # 李姓穷举
    $liSeen = @{}
    $liCount = 0
    foreach ($mm in $liRe.Matches($content)) {
      $raw = $mm.Value
      $key = "$pgid|$raw"
      if ($liSeen.ContainsKey($key)) { continue }
      $liSeen[$key] = 1
      $liCount++
      if ($liCount -gt 60) { break }
      $flags['li'] = 1
      $i = $mm.Index
      $start = [Math]::Max(0, $i - 15)
      $before = $content.Substring($start, $i - $start)
      $alen = [Math]::Min(50, $content.Length - ($i + $mm.Length))
      $after = $content.Substring($i + $mm.Length, $alen)
      [System.IO.File]::AppendAllText($liRawFile, "$($b.id),$pgid,$raw," + (CsvEscape $before) + "," + (CsvEscape $after) + ",," + "`r`n", $enc)
      # 聚合
      if (-not $liNameAgg.ContainsKey($raw)) {
        $liNameAgg[$raw] = @{ count = 0; books = @{}; pages = New-Object System.Collections.Generic.List[string]; ctx = $after }
      }
      $liNameAgg[$raw].count++
      if (-not $liNameAgg[$raw].books.ContainsKey($b.id)) { $liNameAgg[$raw].books[$b.id] = 1 }
      if ($liNameAgg[$raw].pages.Count -lt 3 -and -not $liNameAgg[$raw].pages.Contains($pgid)) { $liNameAgg[$raw].pages.Add($pgid) }
    }

    if ($hitThisPage) { $hitAny++ }
    $row = "$($b.id),$pgid,$tl,$($flags.A),$($flags.B),$($flags.C),$($flags.D),$($flags.X),$($flags.li)"
    $pageRows.Add($row)
  }

  [System.IO.File]::AppendAllLines($pagesFile, $pageRows, $enc)
  $status = 'full_scan_done'
  $note = "markers=$total empty_pages=$emptyCount hit_pages=$hitAny"
  [System.IO.File]::AppendAllText($reviewFile, "$($b.id),$total,$emptyCount,$hitAny,$status,$note`r`n", $enc)
  $grpInfo = "A=$($grpHit.A) B=$($grpHit.B) C=$($grpHit.C) D=$($grpHit.D) X=$($grpHit.X)"
  [void]$summary.AppendLine("BOOK $($b.id): total=$total empty=$emptyCount hitpages=$hitAny")
  Write-Output "BOOK $($b.id): total=$total empty=$emptyCount hitpages=$hitAny"
}

# 李姓汇总表
$liRows = New-Object System.Collections.Generic.List[string]
foreach ($raw in $liNameAgg.Keys) {
  $info = $liNameAgg[$raw]
  $pagesStr = ($info.pages -join ';')
  $booksStr = ($info.books.Keys -join ';')
  $liRows.Add("$raw,$($info.count),$booksStr,$pagesStr," + (CsvEscape $info.ctx))
}
$liRows.Sort()
[System.IO.File]::WriteAllLines($liNamesFile, $liRows, $enc)

[System.IO.File]::WriteAllText($summaryFile, $summary.ToString(), $enc)
Write-Output "DONE. li_unique=$($liNameAgg.Count)"
