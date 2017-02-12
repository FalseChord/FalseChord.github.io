爬蟲心得：開發時遇到的問題與小技巧整理
=====================

這篇文章記錄了使用 Scrapy 爬圖時遇到的問題，包括整個 stack 所遇到的大大小小的問題，和使用的方法：
Python + Scrapy + Database(postgresql)，parse 使用的語言是 xpath。

### 目錄

* [Python](#Python)
* [Postgresql](#Postgresql)
* [Scrapy](#Scrapy)
* [xpath](#xpath)

## Python

1. 使用 Python class method 要注意參數數量：
    在撰寫 Spider class 時，spider 的內部方法也跟 python 的 class method 一樣，第一個參數要給 self，也就是這個 instance 本身。忽略了這個會產生顯而易見的錯誤。見[教學](http://www.liaoxuefeng.com/wiki/0014316089557264a6b348958f449949df42a6d3a2e542c000/001431864715651c99511036d884cf1b399e65ae0d27f7e000)
2. 利用列表生成式
    我的 config 需要傳入一個 array 作為要開始 parse 的 url 列表，雖然 config 是 Pyhton，但我希望內容都是以定義 config 為主，裡面不要有運算的敘述。因此當我想要輸入一長串相近、只有尾數有差的 url 時，除了全部條列出來以外，還能用[列表生成式](http://www.liaoxuefeng.com/wiki/0014316089557264a6b348958f449949df42a6d3a2e542c000/001431779637539089fd627094a43a8a7c77e6102e3a811000)來定義。
3. list.append return None
    承上，當我想要宣告一個比較複雜的 array 時(比如說多個列表生成式)，一開始想說可以用 append 的方式每個 array 全部串起來。但是 append return [居然是 None](http://stackoverflow.com/questions/1682567/why-does-pythons-list-append-evaluate-to-false)，我想我是太習慣於 javascript 的鏈式寫法了。後來找了個 [itertools](https://docs.python.org/3/library/itertools.html) 可以對 list 告種操作，像是串起所有生成式就直接 chain(e1, e2, ...) 即可。
