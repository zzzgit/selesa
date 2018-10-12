set nu!
" set cursorline
" set spell
set spelllang=en_us
let mapleader=";"
:inoremap mmm <Esc>
:nnoremap 00 $
:vnoremap 00 $
:vnoremap <leader>y :r !pbcopy<CR><CR>
:nnoremap <leader>p :w !pbpaste<CR><CR>
:cnoremap sw w !sudo tee >/dev/null %

:nnoremap <silent> <C-k> :call <SID>swap_up()<CR>
:nnoremap <silent> <C-j> :call <SID>swap_down()<CR>

for i in range(97,122)
  let c = nr2char(i)
  exec "map \e".c." <M-".c.">"
  exec "map! \e".c." <M-".c.">"
endfor

function! s:swap_lines(n1, n2)
    let line1 = getline(a:n1)
    let line2 = getline(a:n2)
    call setline(a:n1, line2)
    call setline(a:n2, line1)
endfunction

function! s:swap_up()
    let n = line('.')
    if n == 1
        return
    endif

    call s:swap_lines(n, n - 1)
    exec n - 1
endfunction

function! s:swap_down()
    let n = line('.')
    if n == line('$')
        return
    endif

    call s:swap_lines(n, n + 1)
    exec n + 1
endfunction
