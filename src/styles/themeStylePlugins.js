const plugin = require('tailwindcss/plugin')

exports.cyberpunkLightBorders = plugin(({ addUtilities }) => {
  const cyberpunkLightBorders = {
    '.cyberpunk-border': {
      position: 'relative',
      '&::after': {
        content: "''",
        position: 'absolute',
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
        borderRadius: 'inherit',
        border: '2px solid transparent',
        'mask-composite': 'exclude'
      }
    }
  }
  addUtilities(cyberpunkLightBorders, ['focus-within', 'hover', 'active'])
})

exports.cyberpunkBgLight = plugin(({ addUtilities }) => {
  addUtilities(
    {
      '.cyberpunk-bg-light': {
        position: 'relative',
        '&::before': {
          content: "''",
          position: 'absolute',
          top: '15px',
          bottom: '15px',
          left: '15px',
          zIndex: '-1', // !!! is't parent node must have a new stacking context (like css isolation)
          pointerEvents: 'none',
          width: '60%',
          borderRadius: '50%',
          opacity: '.45',
          mixBlendMode: 'hard-light'
        },
        '&::after': {
          content: "''",
          position: 'absolute',
          top: '15px',
          bottom: '15px',
          right: '15px',
          zIndex: '-1', // !!! is't parent node must have a new stacking context (like css isolation)
          pointerEvents: 'none',
          width: '60%',
          borderRadius: '50%',
          opacity: '.45',
          mixBlendMode: 'hard-light'
        }
      },
      '.cyberpunk-bg-light-acceleraytor': {
        position: 'relative',
        '&::before': {
          content: "''",
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '442px',
          height: '442px',
          transform: 'translate(-50%, -50%)',
          willChange: 'transform',
          zIndex: '-1',
          pointerEvents: 'none',
          backgroundBlendMode: 'lighten, color-burn, normal',
          filter: 'blur(132px)',
          opacity: '.45'
        }
      },
      '.cyberpunk-bg-light-acceleraytor-detail-page': {
        position: 'sticky',
        '&::before': {
          content: "''",
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '620px',
          height: '620px',
          transform: 'translate(-50%, -50%)',
          willChange: 'transform',
          zIndex: '-1',
          pointerEvents: 'none',
          backgroundBlendMode: 'lighten, color-burn, normal',
          filter: 'blur(132px)',
          opacity: '.15'
        }
      },
      '.cyberpunk-bg-acceleraytor-prject-step-1, .cyberpunk-bg-acceleraytor-prject-step-2, .cyberpunk-bg-acceleraytor-prject-step-3':
      {
        position: 'relative',
        contain: 'paint',
        '&::before': {
          content: "''",
          position: 'absolute',
          top: '130%',
          left: '90%',
          width: '346px',
          height: '346px',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          backgroundBlendMode: 'lighten, color-burn, normal',
          willChange: 'transform',
          filter: 'blur(133px)',
          opacity: '.25'
        }
      },
      '.cyberpunk-bg-acceleraytor-prject-step-2': {
        '&::before': {
          with: '282px',
          height: '282px',
          top: '-19%',
          left: '53%'
        }
      },
      '.cyberpunk-bg-acceleraytor-prject-step-3': {
        '&::before': {
          top: '36%',
          left: '95%'
        }
      }
    },
    ['hover', 'active']
  )
})

exports.glassStyle = plugin(({ addUtilities }) => {
  addUtilities({
    '.frosted-glass-smoke , .frosted-glass-lightsmoke , .frosted-glass-teal , .frosted-glass-skygray , .frosted-glass':
    {
      '--text-color': 'hsl(0, 0%, 100%)',
      '--border-color': 'hsl(0, 0%, 100%)',
      '--bg-board-color': 'hsl(0, 0%, 100%, 0.12)',
      '--bg-board-color-2': 'hsl(0, 0%, 100%, 0)',

      position: 'relative',

      color: 'var(--text-color)',
      background: "#288f8f",
      border: "0px solid",
      isolation: 'isolate',
      '&::before': {
        content: "''",
        position: 'absolute',
        inset: 0,
        zIndex: '-1',
        opacity: '0.7',
        background: 'transparent',
        borderRadius: 'inherit',
        // boxShadow: 'inset 0 0 0 var(--border-line-width, 1.5px) var(--border-color)',
      }
    },
    '.frosted-glass-teal.ghost': {
      '--text-color': '#508cf3',
      '--border-color': 'hsl(165, 87%, 65%, 0.5)',
      '--bg-board-color': 'hsl(183, 67%, 54%, 0.05)',
      '--bg-board-color-2': 'hsl(183, 67%, 54%, 0)'
    },
    '.frosted-glass-skygray': {
      '--text-color': '#ABC4FF',
      '--border-color': '#ABC4FF',
      '--bg-board-color': 'rgba(171, 196, 255, 0.2)',
      '--bg-board-color-2': 'rgba(171, 196, 255, 0)'
    },
    '.frosted-glass-lightsmoke': {
      '--border-color': 'hsl(0, 0%, 100%)',
      '--bg-board-color': 'hsl(0, 0%, 100%, 0.08)',
      '--bg-board-color-2': 'hsl(0, 0%, 100%, 0)',
      '--text-color': 'hsl(0, 0%, 100%)'
    },
    '.frosted-glass-smoke': {
      '--border-color': 'hsl(0, 0%, 100%)',
      '--bg-board-color': 'hsl(0, 0%, 100%, 0.12)',
      '--text-color': 'hsl(0, 0%, 100%)'
    },
    '.forsted-blur-lg': {
      '--blur-size': '6px',
      backdropFilter: 'blur(calc(var(--blur-size) * (-1 * var(--is-scrolling, 0) + 1)))'
    },
    '.forsted-blur': {
      '--blur-size': '3px',
      backdropFilter: 'blur(calc(var(--blur-size) * (-1 * var(--is-scrolling, 0) + 1)))'
    },
    '.forsted-blur-sm': {
      '--blur-size': '2px',
      backdropFilter: 'blur(calc(var(--blur-size) * (-1 * var(--is-scrolling, 0) + 1)))'
    },
    '.frosted-blur-none': {
      '--blur-size': '0'
    }
  })

  addUtilities({
    '.home-rainbow-button-bg': {
      borderRadius: '12px',
      backgroundPosition: '30% 50%',
      backgroundSize: '150% 150%',
      transition: '500ms',
      '&:hover': {
        backgroundPosition: '99% 50%'
      }
    }
  })
})

// TODO
// exports.coinRotateLoop = plugin(({ addUtilities }) => {
//   addUtilities({
//     '.swap-coin': {
//       position: 'relative',
//       animation: 'rotate-y-infinite 2s infinite',
//       animationDelay: 'var(--delay, 0)',
//       transformStyle: 'preserve-3d',
//       '.line-group': {
//         position: 'absolute',
//         top: '0',
//         right: '0',
//         bottom: '0',
//         left: '0',
//         transformStyle: 'inherit',
//         '.line-out': {
//           top: '50%',
//           position: 'absolute',
//           left: '50%',
//           width: '50%',
//           transformOrigin: 'left',
//           transformStyle: 'inherit'
//         },
//         '.line-inner': {
//           position: 'absolute',
//           left: '100%',
//           backgroundColor: 'var(--ground-color-dark-solid)',
//           transform: 'translateY(-50%) translateX(-64%) rotateY(90deg)',
//           width: '6px',
//           height: '13px',
//           border: '1px solid rgba(255, 255, 255, 0.5)',
//           borderLeft: 'none',
//           borderRight: 'none'
//         }

//       }
//     }
//   })
// })
