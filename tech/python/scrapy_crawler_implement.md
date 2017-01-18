爬蟲心得：使用scrapy框架
=====================

### 1. 前言

最初是玩了手遊，覺得畫風很喜歡所以想把這款手遊的角色圖都收藏起來。
其實也是可以一張一張慢慢右鍵下載，但身為一個懶惰工程師，自然不可能不想偷懶。
剛好最近想學習Python，就選了一個python寫的爬蟲框架叫做Scrapy來做為下載器的基底。

Scrapy是一個讓你爬網路上資料的框架，下面是官網的架構圖。
![架構圖](https://doc.scrapy.org/en/latest/_images/scrapy_architecture_02.png)

我只用到其中的spider和item pipeline這兩種模組：
    Spider用來定義要爬哪些內容，
    Item pipeline則是用來將爬下來的內容定義為Item，並處理之。

接下來會紀錄一下我的做法。

### 2. 建立專案

# 首先在安裝完python和scrapy後，我們在喜愛的地點建立專案目錄：
請參照[官方教學](https://doc.scrapy.org/en/latest/intro/tutorial.html)中的 Creating Project 一段。

### 3. 撰寫 Spiders

# 接著撰寫 spider 模組：
這裡選用 [CrawlSpider](https://doc.scrapy.org/en/latest/topics/spiders.html#crawlspider) ，它繼承 [Spider](https://doc.scrapy.org/en/latest/topics/spiders.html)，除了 name, allowed_domains, start_url 這些屬性可設定外，還可以自己寫 rules ，省去在 callback function 中自己 parse 的麻煩。

# 客製化 Config
因為製作parse工具很麻煩，只用在 parse 一個網站上太可惜了，因此想擴展這個 spider ，讓它可以根據我制定的規則，提取頁面裡的所有圖片，而且所有的頁面和規則都要可以從 config 設定。
參考[這個教學](http://wuchong.me/blog/2015/05/22/running-scrapy-dynamic-and-configurable/)，我可以根據 config 動態產生 spider ，並且定義 link extractor ，甚至指定每個 rule 的 callback (當然必須事先定義在 spider 裡)。
以下是粗略的

程式啟動點：

    settings = get_project_settings()
    @defer.inlineCallbacks
    def spawnSpiders():
        for config in configs:
            #針對不同 rule 客製化 scrapy settings
            runner = CrawlerRunner(settings)
            spider = SpiderFactory(config) #根據 config 產生 spider
            yield runner.crawl(spider)
        reactor.stop()
    spawnSpiders()
    reactor.run()

SpiderFactory：

    def SpiderFactory(config, BaseSpider=BaseSpider):
        def __init__(self):
            self.start_urls = config['url'] #用丟進來的 config 設定 rule(以及裡面的 link extractor)
            for rule in config['rules']:
                self.rules.append(Rule(
                    LinkExtractor(**rule['extractor']),
                    callback=rule['callback'],
                ))
            BaseSpider.__init__(self)
        newSpiderClass = type(config['name']+'Class', (BaseSpider,), {"__init__": __init__}) #自訂 class name, 方便 debug
        return newSpiderClass

之後就可以自己快樂的定義 BaseSpider, 還有那些用來處理 parsed item 的 callback function 了。 

### 4. 爬蟲的資料處理

好的這邊需要理解一下 scrapy 的 parse 流程。
我們撰寫 spider 是需要取得網頁裡的某些東西，而 scrapy 是達成這項目的的工具，它能做的是幫你追蹤連結並且將頁面的HTML抓下來，**讓你判斷裡面是不是有你要的內容**。因此，上面提到的 crawlspider阿，rules阿，linkextractor阿都是在幫你抓 url ，真正決定要收集哪些資料則是在 callback 中判斷的。

判斷是我們需要的資料後，通常會從網頁裡收集一些相關資訊。以圖片來說像是圖片說明、圖片大小等等。這些資訊加上圖片(url)本身會包裝成一個 item 物件。Item 是 scrapy 處理資料的基本單位，以 class 的方式定義，如下：

    class ImageItem(scrapy.Item):
        names = scrapy.Field()
        image_sizes = scrapy.Field()

定義好 item 後，在 callback 中 yield 這個 item 物件即可讓資料流進 item pipeline 。

### 5. Item pipeline

Item pipeline 是架構圖中，我們會使用的的第二種模組，它的功能顧名思義是用來處理 Item, 像是我們在上一節所定義的 ImageItem 。
在這個實作中我希望能把 parse 出來的 image 下載保存起來，並且造冊列管。

在實作下載功能之前要注意，若要使用 item pipeline，得先在 settings.py 設定使用哪些 pipeline。

    ITEM_PIPELINES = {
        'myProject.pipelines.ImageDataProcessPipeline': 300,
        'myProject.pipelines.ImageFetchPipeline': 100
    }

其中的 myProject.pipeline.classname 是 pipeline 的 class namespace，而後面的數字代表優先程度，數字越小代表優先程度越高，從0~1000。

接著，根據[教學](https://doc.scrapy.org/en/latest/topics/media-pipeline.html)， scrapy 其實已經有提供下載功能。只要在 Item 中加入 'image_urls' 項( url field 可以在 settings 設定)，填入你要下載的 url ，剩下的都會幫你處理好。 Config 中可設定儲存位置、縮圖製作、 Cache expiration、圖片大小過濾等等。

不過因為我想要紀錄圖片的 checksum, 完整的儲存路徑，需要對 imagepipeline 回傳的資料中額外加入一些寫入資料庫所需的資料，所以這邊對 image pipeline 進行繼承，做一些改動，繼承的方式可參考[教學](https://doc.scrapy.org/en/latest/topics/media-pipeline.html#module-scrapy.pipelines.files)。

至於圖片資料寫入資料庫中，資料庫我採用的是 postgresql ，主要是沒用過，想作為練習般試用一下。因為 Schema 非常簡單，未來要移動到其他資料庫甚至 NoSql 也是很方便的。 Python 介接當然就使用目前較多人用的 psycopg2 library。資料處理部分寫了另一個 class 封裝起來，但是資料庫的連線和斷線需要在 spider 開始和關閉時處理，還好 pipeline 提供了 open_spider 和 close_spider 等 classmethod 可以覆寫。

    class ImageDataProcessPipeline(object):
    def open_spider(self, spider):
        #psql initiate connection ...
    def close_spider(self, spider):
        #psql close connection ...
    def process_item(self, item, spider):
        #psql add image item ...

### 6. 結語

至此，差不多就完成了：
1. 利用 rule 和 linkextractor 中的各種 filter 設定，找到需要的網頁。
2. 在 callbacl 中用自訂的 xpath 或 css ，過濾出資料位置，用 Item class 回傳資料。
3. 使用 Item pipeline 下載並儲存圖片與相關資料。

之後會在另一篇寫一些遇到的問題和解決方法。
























