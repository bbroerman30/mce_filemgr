mce_filemgr
============

File Manager for TinyMCE 3.1.0.1<br>
<br>
You should be able to plug this into TinyMCE in place of the existing 
file manager plugin <br>
<br> 
The uploader uses my FTP applet. If you want, you can switch easily to the
SFTP Applet by changing the code at the end of image.htm.<br>
<br>
The FTPApplet communicates with the ftpauthserver.php to read the directory,
authorize uploads, and process uploaded files. You should become familiar
with it. The file filemgr.php should be moved outside the doc root, as it
should contain the FTP username and password for uploads. You will need
to update the path definitions inside (at the top of) ftpauthserver.php<br>
<br>
Also, most likely, you will want to re-sign the JAR file. I currently have it signed with a 
self-signed certificate. While this may be good enought for your personal use, it probably wouldn't be
good for production sites.  Additionally, the applet does not work well with Java 1.7.<br>
<br>
For more information on FTPApplet and SFTPApplet see the respective GIT repositories at
https://github.com/bbroerman30/FTPApplet and https://github.com/bbroerman30/SFTPApplet<br>
<br>
For a working demo, please check out <a href='http://www.bbroerman.net/tinymce1.html'> This Link </a>
<br>
Portions are Copyright 2003-2008, Moxiecode Systems AB.<br>
Portions are Copyright 2009, Brad Broerman<br>
<br>