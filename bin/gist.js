import { Octokit } from '@octokit/rest'

const desc = 'selesa cloud data'

const getOctokit = (token)=> {
	return new Octokit({ auth: token })
}

export default {
	createGist(token){
		const octokit = getOctokit(token)
		return octokit.gists.create({
			description: desc,
			files: {
				'..selesa': {
					content: '.selesa place holder',
				},
			},
			public: false,
		}).then((result)=> {
			return result.data.id
		})
	},
	deleteGist(token, id){
		const octokit = getOctokit(token)
		return octokit.gists.delete({
			gist_id: id,
		})
	},
	update(token, id, files){
		// if there's an empty file, we need to delete it from the gist, to avoid error 422
		Object.entries(files).forEach(([key, file])=> {
			if(!file.content){
				delete files[key]
				return null
			}
			if (file.content.trim() === ''){
				delete files[key]
				return null
			}
		})
		const octokit = getOctokit(token)
		return octokit.gists.update({
			gist_id: id,
			description: desc,
			files,
		})
	},
	query(token, id){
		const octokit = getOctokit(token)
		return octokit.gists.get({
			gist_id: id,
		}).then((result)=> {
			return {
				'.bashrc': result.data.files['.bashrc']?.content,
				'helix_config.toml': result.data.files['helix_config.toml']?.content,
				'helix_languages.toml': result.data.files['helix_languages.toml']?.content,
				'.gitconfig': result.data.files['.gitconfig']?.content,
				'Microsoft.PowerShell_profile.ps1': result.data.files['Microsoft.PowerShell_profile.ps1']?.content,
				config: result.data.files['config']?.content,
			}
		})
	},
}
