// 找出指定目录下面，满足时间条件的文件或文件夹，然后打包他们

const Fs = require('fs')
const Path = require('path')
const Yazl = require("yazl")

const ZipByTimeTool = {
	zip: function (dirname, startTime, endTime) {
		const directory = Path.resolve(process.cwd(), dirname)
		if(!Fs.existsSync(directory)) throw new Error(`${directory}不存在`)
		const stats = Fs.lstatSync(directory)
		if(!stats.isDirectory()) throw new Error(`${directory}不是目录`)

		const {startTimeMs, endTimeMs} = this.getTime(startTime, endTime)

		const packages = Fs.readdirSync(directory)
		const newPackages = packages.filter(package => {
			package = Path.join(directory, package)
			const stats = Fs.lstatSync(package)

			return this.inTime(startTimeMs, endTimeMs, stats.atimeMs)
				&&  this.inTime(startTimeMs, endTimeMs, stats.mtimeMs)
				&& this.inTime(startTimeMs, endTimeMs, stats.ctimeMs)
				&& this.inTime(startTimeMs, endTimeMs, stats.birthtimeMs)
		}).map(packge => Path.join(directory, packge))

		this._zip(newPackages, directory)
	},
	getTime: function (startTime, endTime) {
		var startTimeMs, endTimeMs
		if(startTime && endTime){
			startTimeMs = new Date(startTime).getTime()
			endTimeMs = new Date(endTime).getTime()
		} else if(startTime && /d|h$/.test(startTime)) {
			endTimeMs = Date.now()
			if(startTime.endsWith('d')){
				startTimeMs = endTimeMs -  parseInt(startTime) * this.DAY_MS
			} else {
				startTimeMs = endTimeMs -  parseInt(startTime) * this.HOUR_MS
			}
		} else {
			endTimeMs = Date.now()
			startTimeMs = endTimeMs - this.DAY_MS
		}
		return {startTimeMs, endTimeMs}
	},
	inTime: function (ms1, ms2, val) {
		return val === undefined || (val >= ms1 && val <= ms2)
	},
	_zip: function (files, directory) {
		var zipfile = new Yazl.ZipFile()

		function addFiles (files) {
			files.forEach(file => {
				var stats = Fs.lstatSync(file)
				if(stats.isDirectory()){
					addFiles(Fs.readdirSync(file).map(subFile => {
						return Path.join(file, subFile)
					}))
				} else {
					zipfile.addFile(file, Path.basename(directory) +Path.sep+ file.split(directory + Path.sep)[1])
				}
			})
		}

		addFiles(files)

		zipfile.end()

		zipfile.outputStream.pipe(Fs.createWriteStream(Path.basename(directory)+'-'+Date.now()+'.zip')).on("close", function() {
		  console.log("done");
		})
	},
	DAY_MS: 24 * 60 * 60 * 1000,
	HOUR_MS: 60 * 60 * 1000
}

var dir, startTime, endTime
if(process.argv.length === 2){
	dir = './storage'
	startTime = '1d'
	endTime = undefined
} else if(process.argv.length === 3){
	dir = './storage'
	startTime = process.argv[2]
	endTime = undefined
} else if(process.argv.length === 4){
	dir = process.argv[2]
	startTime = process.argv[3]
	endTime = undefined
} else if(process.argv.length === 5){
	dir = process.argv[2]
	startTime = process.argv[3]
	endTime = process.argv[4]
} else {
	console.log(`
		Usage: node zip.js
			   node zip.js 1d
			   node zip.js 1h
			   node zip.js my_dir 1d
			   node zip.js my_dir "2018-02-03 15:00" "2018-02-06 13:00"`)
	return 
}
ZipByTimeTool.zip(dir, startTime, endTime)



 
