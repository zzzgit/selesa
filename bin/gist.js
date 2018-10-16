const octokit = require('@octokit/rest')()

const desc = "selesa cloud data"
const version = require("../package.json").version
const login = (token) => {
	octokit.authenticate({
		type: 'token',
		token: token
	})
}



module.exports = {
	createGist(token) {
		login(token)
		return octokit.gists.create({
			description: desc,
			files: {
				"..selesa": {
					content: ".selesa place holder"
				}
			},
			public: false
		}).then(result => {
			//result.status !== 201
			return result.data.id
		})
	},
	uploadBash(token, id, bashrcContent, bashPrContent) {
		login(token)
		return octokit.gists.edit({
			gist_id: id,
			description: desc,
			files: {
				"..selesa": {
					content: JSON.stringify({ "lastUpload": new Date().toISOString(), "version": version })
				},
				".bashrc": {
					content: bashrcContent
				},
				".bash_profile": {
					content: bashPrContent
				},
			}
		})
	},
	uploadVim(token, id, vimContent) {
		login(token)
		return octokit.gists.edit({
			gist_id: id,
			description: desc,
			files: {
				"..selesa": {
					content: JSON.stringify({ "lastUpload": new Date().toISOString(), "version": version })
				},
				".vimrc": {
					content: vimContent
				},
			}
		})
	},
	download(token, id) {
		login(token)
		return octokit.gists.get({
			gist_id: id,
		}).then(result => {
			return {
				".bashrc": result.data.files[".bashrc"].content,
				".bash_profile": result.data.files[".bash_profile"].content,
				".vimrc": result.data.files[".vimrc"].content,
			}
		})
	},
}
