爬蟲心得：開發時遇到的問題與小技巧整理
=====================

這篇文章記錄了使用 Scrapy 爬圖時遇到的問題，包括整個 stack 所遇到的大大小小的問題，和使用的方法：
Python + Scrapy + Database(postgresql)，parse 使用的語言是 xpath。

### 目錄
* Python
* Postgresql
* Scrapy
* xpath

## Python

1. 使用 Python class method 要注意參數數量：
    在撰寫 Spider class 時，spider 的內部方法也跟 python 的 class method 一樣，第一個參數要給 self，也就是這個 instance 本身。忽略了這個會產生顯而易見的錯誤。見[教學](http://www.liaoxuefeng.com/wiki/0014316089557264a6b348958f449949df42a6d3a2e542c000/001431864715651c99511036d884cf1b399e65ae0d27f7e000)
2. 利用列表生成式
    我的 config 需要傳入一個 array 作為要開始 parse 的 url 列表，雖然 config 是 Pyhton，但我希望內容都是以定義 config 為主，裡面不要有運算的敘述。因此當我想要輸入一長串相近、只有尾數有差的 url 時，除了全部條列出來以外，還能用[列表生成式](http://www.liaoxuefeng.com/wiki/0014316089557264a6b348958f449949df42a6d3a2e542c000/001431779637539089fd627094a43a8a7c77e6102e3a811000)來定義。
3. list.append return None
    承上，當我想要宣告一個比較複雜的 array 時(比如說多個列表生成式)，一開始想說可以用 append 的方式每個 array 全部串起來。但是 append return [居然是 None](http://stackoverflow.com/questions/1682567/why-does-pythons-list-append-evaluate-to-false)，我想我是太習慣於 javascript 的鏈式寫法了。後來找了個 [itertools](https://docs.python.org/3/library/itertools.html) 可以對 list 告種操作，像是串起所有生成式就直接 chain(e1, e2, ...) 即可。

## Postgresql

1. SQL語句結尾要加分號
    沒錯就是這個坑，從前在 MySql 也被搞過，沒想到現在又中了，著實被浪費了一點時間。

## Scrapy

1. linkextractor 的 canonicalize 參數
    在使用 CrawlerSpider 時遇到了神奇的現象：某個網站被 parse 出來的 url 後面總是會多了 '=' 符號，導致網站去到錯誤的頁面。不斷的排查才發現，需要將[Link Extractors 中的 canonicalize 設定為 False](https://doc.scrapy.org/en/latest/topics/link-extractors.html)才有辦法解決。查看了 Canonicalize 所使用的 [w3lib](http://w3lib.readthedocs.io/en/latest/w3lib.html) 文件還是搞不清楚，Orz。
2. 將 relative 的 url 標準化
    大家應該都知道， html 的 <img>或<a> tag 中的 url 是可以寫 relative 的。因此在返回新的 Request 繼續 parse 前，需要自己[把 domain 串接起來](http://stackoverflow.com/questions/10798118/combining-base-url-with-resultant-href-in-scrapy)。這邊我使用的是 [urlparse module](https://docs.python.org/2/library/urlparse.html) 的 urljoin mothod 來完成。
3. Scrapy 設定圖片最小長寬
    需要過濾一些 icon，想用圖片大小做過濾，爬了文件以後發現可以在 Setting.py 中設定 "IMAGES_MIN_WIDTH" 和 "IMAGES_MIN_HEIGHT"，當長或寬任何一邊小於設定，該圖便會被 Drop 掉。
4. 傳遞參數給 CrawlerSpider 需要注意之處
    這是一個大坑，被它搞得要更改 config 結構，森77。
    首先我們知道， CrawlerSpider 能夠[使用 rule 傳遞參數給 callback function](https://doc.scrapy.org/en/latest/topics/spiders.html#crawling-rules) ，我本來使用這個方式傳送用來 parse 頁面圖片的規則，但當網頁結構複雜，我就需要手動建立並 yield Request(其實也可以使用定義多個 Rule 的方式，但是會需要重複撰寫自訂參數，且多個 filter 同時作用我擔心會有預期外的效應 parse 到不需要的東西)，但卻發現 rules 中的自訂參數無法帶進被 Request 觸發的 callback 中。最後只好在 callback function 中主動讀取 config，為了做到這件事，我需要改動 config 的結構，除了原本主要的 list 外，為了讓 callback 根據 spider name 存取，以 dictionary 的方式建立另一個 config。如下：

    configs = [{
        'type': 'generic',
        'name': 'spider name 1',
        'url': [
            'http://domain.one/one/'
        ],
        'rules': [{
            'extractor': {
                'allow': [
                    'http://domain.one/*'
                ],
                'canonicalize':False,
                'restrict_xpaths': "(//td[@class='ltable']//p)[2]/a"
            },
            'callback': 'link_parsed',
        }]
    }]
    callbackConfig = {
        'spider name 1':{
            'link_parsed':{
                'target_dom':"//table[@class='style_table']//td[3]//a/@href",
                'name_dom':"",
                'follow':"handle_redirect"       
            },
            'handle_redirect':{
                'target_dom':"//table[@class='style_table']//a/img/@src",
                'name_dom':"//div[@id='title']/h1/text()",
            }
        }
    }

    Spider 的建立寫在 'configs' list 中，對於每個 item 都會建立 spider instance，然後在每個 callback 中都會針對自己的 spider name 和 [callback name](http://stackoverflow.com/questions/251464/how-to-get-a-function-name-as-a-string-in-python) 讀取 callbackConfig 中不同的欄位。
5. 自訂 referer
    曾經遇過 request 403，但用瀏覽器卻打得開的情況，仔細用 developer tool 看過以後發現是缺少了 Referer 所造成。要塞自訂 header 進去可以在 Settings.py 中設定 [DEFAULT_REQUEST_HEADERS](https://doc.scrapy.org/en/latest/topics/settings.html#default-request-headers)。
6. 升級 Scrapy 至 v1.3
    這也是個坑吧，根據 [issue](https://github.com/scrapy/scrapy/issues/2004) 所說，這是個 bug，必須升級到 v1.3 才能開啟 Orz。
    或者也可以依照[這篇文章](http://stackoverflow.com/questions/37368030/error-302-downloading-file-in-scrapy/38783648)，的做法，再多一層 Request 來解決 redirect 的問題。
7. 規範化 callback
    因為需要定義多個 callback ，再根據 callback name 去 apply 不同的 callbackConfig，會造成明明 callback 內容相同只有名字不同的狀況，這邊還要再想想要怎麼 refactor。

## Postgresql

1. 利用開發者工具測試 xpath
    Google Chrome 的 element tab 可以吃 xpath，用它來測試非常方便。
2. 技巧：根據其他元素的屬性決定要不要取這個元素
    [教學](http://stackoverflow.com/questions/912194/matching-a-node-based-on-a-siblings-value-with-xpath)
3. 技巧：拿第n個到第m個元素
    [教學](http://stackoverflow.com/questions/4759746/xpath-get-first-10-items-of-selected-set)
4. 技巧：拿第n個元素
    [教學](http://stackoverflow.com/questions/4007413/xpath-query-to-get-nth-instance-of-an-element)

